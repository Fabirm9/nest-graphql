import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { SignUpInput } from 'src/auth/dto/inputs/signup.input';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ValidRoles } from 'src/auth/enums/valid-roles.enum';

@Injectable()
export class UsersService {
  private logger = new Logger();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(signupInput: SignUpInput): Promise<User> {
    try {
      const newUser = this.userRepository.create({
        ...signupInput,
        password: bcrypt.hashSync(signupInput.password, 10),
      });
      return await this.userRepository.save(newUser);
    } catch (error) {
      this.handleDbErrors(error);
    }
  }

  async findAll(roles: ValidRoles[]): Promise<User[]> {
    if (roles.length === 0)
      return this.userRepository.find({
        // relations: {
        //   lastUpdateBy: true,
        // },
      });

    return this.userRepository
      .createQueryBuilder()
      .andWhere('ARRAY[roles] && ARRAY[:...roles]')
      .setParameter('roles', roles)
      .getMany();
  }

  async findOneByID(id: string): Promise<User> {
    try {
      return await this.userRepository.findOneByOrFail({ id });
    } catch (error) {
      throw new NotFoundException(`${id} not found`);
    }
  }

  async findOneByEmail(email: string): Promise<User> {
    try {
      return await this.userRepository.findOneByOrFail({ email });
    } catch (error) {
      throw new NotFoundException(`${email} not found`);
      //this.handleDbErrors({ code: 'error-001', detail: `${email} not found` });
    }
  }

  async update(
    id: string,
    updateUserInput: UpdateUserInput,
    currentUser: User,
  ): Promise<User> {
    try {
      const user = await this.findOneByID(id);

      const userToUpdate = await this.userRepository.preload({
        id: user.id,
        ...updateUserInput,
      });

      userToUpdate.lastUpdateBy = currentUser;

      return await this.userRepository.save(userToUpdate);
    } catch (error) {
      this.handleDbErrors(error);
    }
  }

  async block(id: string, user: User): Promise<User> {
    const userToBlock = await this.findOneByID(id);

    userToBlock.isActive = false;
    userToBlock.lastUpdateBy = user;

    return await this.userRepository.save(userToBlock);
  }

  private handleDbErrors(error: any): never {
    if (error.code === '23505')
      throw new BadRequestException(`Key email already exists.`);

    if (error.code === 'error-001')
      throw new BadRequestException(`Problem with email and password`);

    this.logger.error(error);
    throw new InternalServerErrorException('Please check server logs');
  }
}
