import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  sendMessage(@TenantId() tenantId: string, @Body() body: any) {
    const { recipientId, text, platform } = body;
    return this.messagesService.sendMessage(
      tenantId,
      recipientId,
      text,
      platform,
    );
  }

  @Post('save')
  saveLocalMessage(@TenantId() tenantId: string, @Body() body: any) {
    const { clientPhone, text, sender, platform } = body;
    return this.messagesService.saveLocalMessage(
      tenantId,
      clientPhone,
      text,
      sender,
      platform,
    );
  }

  @Post('send/attachment')
  @UseInterceptors(FileInterceptor('file'))
  sendAttachment(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const { recipientId, platform, caption } = body;
    return this.messagesService.sendAttachment(
      tenantId,
      recipientId,
      platform,
      file,
      caption,
    );
  }
}
