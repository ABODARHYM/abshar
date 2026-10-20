import {
  Body,
  Controller,
  Headers,
  Ip,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponse, AuthUser } from './auth.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer' })
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<AuthResponse> {
    return this.authService.register(dto, {
      userAgent,
      ipAddress,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email or phone' })
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<AuthResponse> {
    return this.authService.login(dto, {
      userAgent,
      ipAddress,
    });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token' })
  refresh(
    @Body() dto: RefreshDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken, {
      userAgent,
      ipAddress,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token' })
  async logout(@Body() dto: RefreshDto): Promise<{ status: string }> {
    await this.authService.logout(dto.refreshToken);
    return { status: 'ok' };
  }

}
