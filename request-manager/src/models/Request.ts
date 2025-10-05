import mongoose, { Schema, Document } from 'mongoose';
import { RequestPayload } from '../interfaces/requestPayload';

export interface IRequest extends Document {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  payload: RequestPayload;
  status: string;
  response?: unknown;
}

export interface IFavoriteRequest extends Document {
  id: string;
  tenantId: string;
  requestId: string;
}

const requestSchema = new Schema<IRequest>({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, required: true, default: 'pending' },
  response: { type: Schema.Types.Mixed },
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
});

requestSchema.index({ tenantId: 1, createdAt: -1 });

const FavoriteRequestSchema = new Schema<IFavoriteRequest>({
  tenantId: { type: String, required: true, index: true },
  requestId: { type: String, required: true },
});

FavoriteRequestSchema.index({ tenantId: 1, requestId: 1 }, { unique: true });

requestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Request = mongoose.model<IRequest>('Request', requestSchema);
export const FavoriteRequest = mongoose.model<IFavoriteRequest>(
  'FavoriteRequest',
  FavoriteRequestSchema
);
