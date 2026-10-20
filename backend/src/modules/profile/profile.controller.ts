import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponse, ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth('access-token')
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile (full)' })
  @ApiResponse({ status: 200, description: 'Profile data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: AuthUser): Promise<ProfileResponse> {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile (fullName, phone, locale)' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @ApiOperation({
    summary: 'Change password — revokes all sessions on success',
  })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password wrong' })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ status: string; revokedSessions: number }> {
    return this.profileService.changePassword(user.id, dto);
  }
}
