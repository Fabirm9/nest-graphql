import { ListsService } from 'src/lists/lists.service';
import { UsersService } from './../users/users.service';
import { SEED_ITEMS, SEED_LISTS, SEED_USERS } from './data/seed-data';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Item } from 'src/items/entities/item.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ItemsService } from 'src/items/items.service';
import { ListItem } from 'src/list-item/entities/list-item.entity';
import { List } from 'src/lists/entities/list.entity';
import { ListItemService } from 'src/list-item/list-item.service';

@Injectable()
export class SeedService {
  private isProd: boolean;

  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(ListItem)
    private readonly listItemsRepository: Repository<ListItem>,

    @InjectRepository(List)
    private readonly listRepository: Repository<List>,

    private readonly usersService: UsersService,
    private readonly itemsService: ItemsService,
    private readonly listsService: ListsService,
    private readonly listItemService: ListItemService,
  ) {
    this.isProd = configService.get('ENVIRONMENT') === 'prod';
  }

  async executeSeed() {
    // if (this.isProd) {
    //   throw new UnauthorizedException('We cannot run SEED on Prod');
    // }

    //Clean database DELETE ALL
    await this.deleteDatabase();

    //create users
    const user = await this.loadUsers();

    //create items
    await this.loadItems(user);

    //create list
    const lists = await this.loadLists(user);

    //create listItems
    const items = await this.itemsService.findAll(
      { limit: 15, offset: 0 },
      {},
      user,
    );
    await this.loadListsItems(lists, items);

    return true;
  }

  async deleteDatabase() {
    // delete ListItems
    await this.listItemsRepository
      .createQueryBuilder()
      .delete()
      .where({})
      .execute();

    // delete List
    await this.listRepository.createQueryBuilder().delete().where({}).execute();

    //delete Items
    await this.itemsRepository
      .createQueryBuilder()
      .delete()
      .where({})
      .execute();

    //delete Users
    await this.usersRepository
      .createQueryBuilder()
      .delete()
      .where({})
      .execute();
  }

  async loadUsers(): Promise<User> {
    const users = [];

    for (const user of SEED_USERS) {
      users.push(await this.usersService.create(user));
    }

    return users[0];
  }

  async loadItems(currentUser: User): Promise<void> {
    const itemsPromises = [];
    for (const item of SEED_ITEMS) {
      itemsPromises.push(await this.itemsService.create(item, currentUser));
    }
    await Promise.all(itemsPromises);
  }

  async loadLists(currentUser: User): Promise<List> {
    const lists = [];

    for (const list of SEED_LISTS) {
      lists.push(await this.listsService.create(list, currentUser));
    }

    return lists[0];
  }

  async loadListsItems(list: List, items: Item[]) {
    for (const item of items) {
      this.listItemService.create({
        quantity: Math.round(Math.random() * 10),
        completed: Math.round(Math.random() * 1) === 0 ? false : true,
        listId: list.id,
        itemId: item.id,
      });
    }
  }
}
