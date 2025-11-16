import mongoose from 'mongoose';

/**
 * Проверка валидности MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Валидация и нормализация ObjectId
 * @throws Error если ID невалидный
 */
export function validateObjectId(id: string, fieldName = 'id'): string {
  if (!isValidObjectId(id)) {
    throw new Error(`Invalid ${fieldName}: ${id}`);
  }
  return id;
}

