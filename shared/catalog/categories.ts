import type { Category, CategoryHandle } from '../types';

export const categories: Category[] = [
  {
    handle: 'camisetas',
    name: 'Camisetas',
    singular: 'Camiseta',
    description: 'Algodón de gramaje alto, cortes oversize y gráficos con intención.',
    silhouette: 'tee',
  },
  {
    handle: 'sudaderas',
    name: 'Sudaderas',
    singular: 'Sudadera',
    description: 'Felpa pesada, capuchas estructuradas y patrones pensados para moverse.',
    silhouette: 'hoodie',
  },
  {
    handle: 'pantalones',
    name: 'Pantalones',
    singular: 'Pantalón',
    description: 'Joggers, cargos y shorts técnicos para la calle y el entrenamiento.',
    silhouette: 'pants',
  },
  {
    handle: 'gorras',
    name: 'Gorras',
    singular: 'Gorra',
    description: 'Gorras y gorros con bordados de alta densidad.',
    silhouette: 'cap',
  },
  {
    handle: 'accesorios',
    name: 'Accesorios',
    singular: 'Accesorio',
    description: 'Bolsas, calcetines y piezas para completar el uniforme.',
    silhouette: 'tote',
  },
  {
    handle: '3d',
    name: '3D',
    singular: 'Blind box',
    description: 'Blind boxes de HYPO: una figura de vinilo por caja, sin saber cuál hasta abrirla.',
    silhouette: 'blindbox',
  },
  {
    handle: 'stickers',
    name: 'Stickers',
    singular: 'Sticker',
    description: 'Vinilo troquelado resistente al agua. Para dejar marca en todas partes.',
    silhouette: 'sticker',
  },
];

export function getCategory(handle: string): Category | undefined {
  return categories.find((category) => category.handle === handle);
}

export function isCategoryHandle(handle: string): handle is CategoryHandle {
  return categories.some((category) => category.handle === handle);
}
