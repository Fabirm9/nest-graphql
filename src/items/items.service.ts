import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateItemInput, UpdateItemInput } from './dto/inputs/';
import { Like, Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
  ) {}

  async create(
    createItemInput: CreateItemInput,
    currentUser: User,
  ): Promise<Item> {
    const newItem = this.itemsRepository.create({
      ...createItemInput,
      user: currentUser,
    });
    return await this.itemsRepository.save(newItem);
  }

  async findAll(
    paginationArgs: PaginationArgs,
    searchArgs: SearchArgs,
    currentUser: User,
  ): Promise<Item[]> {
    const { limit, offset } = paginationArgs;
    const { search } = searchArgs;
    // const result = await this.itemsRepository.find({
    //   take: limit,
    //   skip: offset,
    //   where: {
    //     user: {
    //       id: currentUser.id,
    //     },
    //     name: Like(`%${search}%`),
    //   },
    // });

    const queryBuilder = this.itemsRepository
      .createQueryBuilder()
      .take(limit)
      .skip(offset)
      .where(`"userId" = :userId`, { userId: currentUser.id });

    if (search) {
      queryBuilder.andWhere('LOWER(name) like :name', {
        name: `%${search.toLowerCase()}%`,
      });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string, currentUser: User): Promise<Item> {
    const item = await this.itemsRepository.findOneBy({
      id,
      user: { id: currentUser.id },
    });
    if (!item) throw new NotFoundException(`Item with ${id} not found`);

    //item.user = currentUser;
    return item;
  }

  async update(
    id: string,
    updateItemInput: UpdateItemInput,
    currentUser: User,
  ): Promise<Item> {
    await this.findOne(id, currentUser);
    const item = await this.itemsRepository.preload(updateItemInput);
    if (!item) throw new NotFoundException(`Item with ${id} not found`);
    return this.itemsRepository.save(item);
  }

  async remove(id: string, currentUser: User): Promise<Item> {
    const item = await this.findOne(id, currentUser);

    await this.itemsRepository.remove(item);

    return { ...item, id };
  }

  async itemCounterByUser(user: User): Promise<number> {
    return this.itemsRepository.count({
      where: {
        user: {
          id: user.id,
        },
      },
    });
  }
}
