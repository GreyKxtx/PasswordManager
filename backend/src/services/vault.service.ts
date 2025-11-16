import { VaultItemModel, VaultItemDocument } from '../models/VaultItem';
import { CreateVaultItemDto, UpdateVaultItemDto, VaultItemInfo, VaultImportItemDto } from '../types/vault.types';

export class VaultService {
  /**
   * Получение всех записей пользователя
   */
  async getItems(userId: string): Promise<VaultItemInfo[]> {
    const items = await VaultItemModel.find({ userId })
      .sort({ updatedAt: -1 })
      .exec();

    return items.map((item) => this.toVaultItemInfo(item));
  }

  /**
   * Получение записи по ID
   */
  async getItemById(userId: string, id: string): Promise<VaultItemInfo | null> {
    const item = await VaultItemModel.findOne({
      _id: id,
      userId,
    }).exec();

    if (!item) {
      return null;
    }

    return this.toVaultItemInfo(item);
  }

  /**
   * Создание новой записи
   */
  async createItem(userId: string, dto: CreateVaultItemDto): Promise<VaultItemInfo> {
    const item = new VaultItemModel({
      userId,
      title: dto.title,
      username: dto.username,
      url: dto.url,
      tags: dto.tags || [],
      encryptedData: dto.encryptedData,
      iv: dto.iv,
      version: dto.version || 1,
    });

    await item.save();
    return this.toVaultItemInfo(item);
  }

  /**
   * Обновление записи
   */
  async updateItem(userId: string, id: string, dto: UpdateVaultItemDto): Promise<VaultItemInfo | null> {
    const item = await VaultItemModel.findOneAndUpdate(
      {
        _id: id,
        userId, // Важно: проверяем владельца
      },
      {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.encryptedData !== undefined && { encryptedData: dto.encryptedData }),
        ...(dto.iv !== undefined && { iv: dto.iv }),
        ...(dto.version !== undefined && { version: dto.version }),
      },
      {
        new: true, // Возвращаем обновленный документ
        runValidators: true,
      }
    ).exec();

    if (!item) {
      return null;
    }

    return this.toVaultItemInfo(item);
  }

  /**
   * Удаление записи
   */
  async deleteItem(userId: string, id: string): Promise<boolean> {
    const result = await VaultItemModel.findOneAndDelete({
      _id: id,
      userId, // Важно: проверяем владельца
    }).exec();

    return !!result;
  }

  /**
   * Экспорт всех записей пользователя (для backup)
   */
  async exportVault(userId: string): Promise<VaultItemInfo[]> {
    return this.getItems(userId);
  }

  /**
   * Импорт записей (для restore)
   * Заменяет все существующие записи пользователя на импортированные
   */
  async importVault(userId: string, items: VaultImportItemDto[]): Promise<{ imported: number; deleted: number }> {
    // Удаляем все существующие записи пользователя
    const deleteResult = await VaultItemModel.deleteMany({ userId }).exec();
    const deletedCount = deleteResult.deletedCount || 0;

    // Создаем новые записи из импорта
    const itemsToCreate = items.map((item) => ({
      userId,
      title: item.title,
      username: item.username,
      url: item.url,
      tags: item.tags || [],
      encryptedData: item.encryptedData,
      iv: item.iv,
      version: item.version || 1,
      ...(item.createdAt && { createdAt: item.createdAt }),
      ...(item.updatedAt && { updatedAt: item.updatedAt }),
    }));

    if (itemsToCreate.length > 0) {
      await VaultItemModel.insertMany(itemsToCreate);
    }

    return {
      imported: itemsToCreate.length,
      deleted: deletedCount,
    };
  }

  /**
   * Поиск записей по запросу (по title, username, url, tags)
   */
  async searchItems(userId: string, query: string): Promise<VaultItemInfo[]> {
    const lowerQuery = query.toLowerCase().trim();

    const items = await VaultItemModel.find({
      userId,
      $or: [
        { title: { $regex: lowerQuery, $options: 'i' } },
        { username: { $regex: lowerQuery, $options: 'i' } },
        { url: { $regex: lowerQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(lowerQuery, 'i')] } },
      ],
    })
      .sort({ updatedAt: -1 })
      .exec();

    return items.map((item) => this.toVaultItemInfo(item));
  }

  /**
   * Преобразование документа в VaultItemInfo
   */
  private toVaultItemInfo(item: VaultItemDocument): VaultItemInfo {
    return {
      id: item._id.toString(),
      userId: item.userId.toString(),
      title: item.title,
      username: item.username,
      url: item.url,
      tags: item.tags || [],
      encryptedData: item.encryptedData,
      iv: item.iv,
      version: item.version,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

