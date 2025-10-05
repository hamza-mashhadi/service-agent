import { Router } from 'express';
import { Request, FavoriteRequest } from '../models/Request';
import { rabbitMQService } from '../services/rabbitmq';
import { RequestPayload } from '../interfaces/requestPayload';
import { logger } from '../utils/logger';
import extractTenantId from '../middleware';

const router = Router();

// Apply tenant middleware to all routes
router.use(extractTenantId);

// POST /request
router.post('/', async (req, res) => {
  const payload: RequestPayload = req.body;
  const tenantId = req.tenantId!;

  const validationErrors = validateRequestPayload(payload);
  if (validationErrors) {
    return res.status(400).json({ error: validationErrors });
  }

  const scheduleDate = payload.schedule ? new Date(payload.schedule) : null;
  const now = new Date();

  let initialStatus = 'pending';
  if (!payload.executeNow && scheduleDate && scheduleDate > now) {
    initialStatus = 'scheduled';
  }

  const requestDoc = new Request({
    tenantId,
    payload: {
      name: payload.name,
      method: payload.method,
      url: payload.url,
      headers: payload.headers ?? null,
      body: payload.body ?? null,
      schedule: scheduleDate,
    },
    status: initialStatus,
  });

  const saved = await requestDoc.save();

  const queuePayload = {
    id: saved.id,
    tenantId,
    ...payload,
  };

  try {
    if (payload.executeNow || !scheduleDate || scheduleDate <= now) {
      logger.info(
        `Sending request ${saved.id} for immediate execution (tenant: ${tenantId})`
      );
      await rabbitMQService.publish(
        tenantId,
        process.env.PERFORM_REQUEST_EXCHANGE!,
        queuePayload,
        process.env.PERFORM_REQUEST_ROUTING_KEY!
      );
    } else {
      logger.info(
        `Sending request ${saved.id} to scheduler for execution at ${scheduleDate} (tenant: ${tenantId})`
      );
      await rabbitMQService.publish(
        tenantId,
        process.env.PLAN_REQUEST_JOB_EXCHANGE!,
        queuePayload,
        process.env.SCHEDULE_ROUTING_KEY!
      );
    }
  } catch (err) {
    logger.error('Failed to publish to rabbit:', err);
    return res.status(500).json({ error: 'Failed to queue request' });
  }

  return res.status(201).json(saved);
});

// GET /requests - List all requests with pagination
router.get('/all', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { status, favorite } = req.query;
    const matchFilter: Record<string, unknown> = { tenantId };

    if (status) {
      matchFilter.status = status;
    }

    if (favorite === 'true') {
      const favoriteRequests = await FavoriteRequest.find({ tenantId }).select(
        'requestId'
      );
      const requestIds = favoriteRequests.map(fav => fav.requestId.toString());
      matchFilter._id = { $in: requestIds };
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'favoriterequests',
          let: { requestId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$requestId', '$$requestId'] },
                    { $eq: ['$tenantId', tenantId] },
                  ],
                },
              },
            },
          ],
          as: 'favoriteInfo',
        },
      },
      {
        $addFields: {
          isFavorite: { $gt: [{ $size: '$favoriteInfo' }, 0] },
        },
      },
      {
        $project: {
          favoriteInfo: 0,
        },
      },
      { $sort: { createdAt: -1 as const } },
      { $skip: skip },
      { $limit: limit },
    ];

    const total = await Request.countDocuments(matchFilter);

    const requests = await Request.aggregate(pipeline);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    logger.error('Error fetching requests:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /requests/favorites - List favorite requests with pagination
router.get('/favorites', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get favorite request IDs for the tenant
    const favoriteRequests = await FavoriteRequest.find({ tenantId }).select(
      'requestId'
    );
    const requestIds = favoriteRequests.map(fav => fav.requestId);

    if (requestIds.length === 0) {
      return res.json({
        requests: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    const total = await Request.countDocuments({
      _id: { $in: requestIds },
      tenantId,
    });

    // Get paginated favorite requests and add isFavorite field
    const requests = await Request.find({ _id: { $in: requestIds }, tenantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const requestsWithFavorite = requests.map(request => ({
      ...request,
      isFavorite: true,
    }));

    const totalPages = Math.ceil(total / limit);

    return res.json({
      requests: requestsWithFavorite,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    logger.error('Error fetching favorite requests:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /request/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const found = await Request.findOne({ _id: req.params.id, tenantId });
    if (!found) return res.status(404).json({ error: 'not found' });
    return res.json(found);
  } catch {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
});

// POST /request/:id/favorite - Add to favorites
router.post('/:id/favorite', async (req, res) => {
  const tenantId = req.tenantId!;

  try {
    const request = await Request.findOne({ _id: req.params.id, tenantId });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const existingFavorite = await FavoriteRequest.findOne({
      tenantId,
      requestId: req.params.id,
    });

    if (existingFavorite) {
      return res.status(400).json({ error: 'Already in favorites' });
    }

    const favorite = new FavoriteRequest({
      tenantId,
      requestId: req.params.id,
    });

    await favorite.save();
    return res.json({ message: 'Added to favorites' });
  } catch (err) {
    logger.error('Error adding to favorites:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /request/:id/favorite - Remove from favorites
router.delete('/:id/favorite', async (req, res) => {
  const tenantId = req.tenantId!;

  try {
    const result = await FavoriteRequest.findOneAndDelete({
      tenantId,
      requestId: req.params.id,
    });

    if (!result) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    return res.json({ message: 'Removed from favorites' });
  } catch (err) {
    logger.error('Error removing from favorites:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

function validateRequestPayload(payload: RequestPayload): string | null {
  const missingFields = [];
  if (!payload?.name) missingFields.push('name');
  if (!payload?.method) missingFields.push('method');
  if (!payload?.url) missingFields.push('url');

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }

  return null;
}

export default router;
