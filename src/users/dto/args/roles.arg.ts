import { ArgsType, Field } from '@nestjs/graphql';
import { ValidRoles } from '../../../auth/enums/valid-roles.enum';
import { IsArray } from 'class-validator';

@ArgsType()
export class ValidRolesArgs {
  @Field(() => [ValidRoles], { nullable: true })
  @IsArray()
  roles: ValidRoles[] = [];
}
