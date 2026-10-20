import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['pending', 'active', 'suspended', 'deleted'] })
  @IsIn(['pending', 'active', 'suspended', 'deleted'])
  status!: 'pending' | 'active' | 'suspended' | 'deleted';
}

export class AssignRoleDto {
  @ApiProperty({ example: 'admin' })
  code!: string;
}

export class UpdateStoreStatusDto {
  @ApiProperty({ enum: ['pending', 'active', 'suspended', 'closed'] })
  @IsIn(['pending', 'active', 'suspended', 'closed'])
  status!: 'pending' | 'active' | 'suspended' | 'closed';
}

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: ['pending', 'active', 'suspended'] })
  @IsIn(['pending', 'active', 'suspended'])
  status!: 'pending' | 'active' | 'suspended';
}
