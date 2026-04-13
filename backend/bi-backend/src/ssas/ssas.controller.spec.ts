import { Test, TestingModule } from '@nestjs/testing';
import { SsasController } from './ssas.controller';

describe('SsasController', () => {
  let controller: SsasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SsasController],
    }).compile();

    controller = module.get<SsasController>(SsasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
