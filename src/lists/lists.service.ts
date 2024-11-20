import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateListInput } from './dto/create-list.input';
import { UpdateListInput } from './dto/update-list.input';
import { InjectRepository } from '@nestjs/typeorm';
import { List } from './entities/list.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';

@Injectable()
export class ListsService {
  constructor(
    @InjectRepository(List)
    private readonly listRepository: Repository<List>,
  ) {}

  async create(
    createListInput: CreateListInput,
    currentUser: User,
  ): Promise<List> {
    const newList = this.listRepository.create({
      ...createListInput,
      user: currentUser,
    });
    return await this.listRepository.save(newList);
  }

  async findAll(
    paginationArgs: PaginationArgs,
    searchArgs: SearchArgs,
    currentUser: User,
  ): Promise<List[]> {
    const { limit, offset } = paginationArgs;
    const { search } = searchArgs;

    const queryBuider = this.listRepository
      .createQueryBuilder()
      .take(limit)
      .skip(offset)
      .where(`"userId" = :userId`, { userId: currentUser.id });

    if (search) {
      queryBuider.andWhere('LOWER(name) like :name', {
        name: `%${search.toLowerCase()}%`,
      });
    }

    return queryBuider.getMany();
  }

  async findOne(id: string, currentUser: User): Promise<List> {
    const list = await this.listRepository.findOneBy({
      id,
      user: { id: currentUser.id },
    });
    if (!list) throw new NotFoundException(`List with ${id} not found`);
    list.user = currentUser;
    return list;
  }

  async update(
    id: string,
    updateListInput: UpdateListInput,
    currentUser: User,
  ): Promise<List> {
    await this.findOne(id, currentUser);
    const list = await this.listRepository.preload(updateListInput);
    if (!list) throw new NotFoundException(`List with ${id} not found`);
    return this.listRepository.save(list);
  }

  async remove(id: string, currentUser: User) {
    const list = await this.findOne(id, currentUser);

    await this.listRepository.remove(list);

    return { ...list, id };
  }

  async listCounterByUser(user: User): Promise<number> {
    return this.listRepository.count({
      where: {
        user: {
          id: user.id,
        },
      },
    });
  }
}
