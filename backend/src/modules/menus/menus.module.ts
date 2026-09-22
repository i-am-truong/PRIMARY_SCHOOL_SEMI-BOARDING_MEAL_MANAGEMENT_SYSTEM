import { Module } from '@nestjs/common';
import { MenusController } from './controllers/menus.controller';
import { MenusService } from './services/menus.service';

@Module({
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
