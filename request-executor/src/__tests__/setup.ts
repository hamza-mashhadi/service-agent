// Mock dotenv before any imports
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock process.exit
jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit() was called.');
});
