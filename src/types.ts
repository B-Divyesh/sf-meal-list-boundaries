export type Boundary = {
  id: string;
  name: string;
  symbol: string;
  color: string;
};

export type Ingredient = {
  id: string;
  text: string;
};

export type Meal = {
  id: string;
  weekStart: string;
  day: number;
  title: string;
  boundaryId: string;
  ingredients: Ingredient[];
  updatedAt: string;
};

export type WeekTemplate = {
  id: string;
  name: string;
  meals: Array<Omit<Meal, 'id' | 'weekStart' | 'updatedAt'>>;
};

export type AppState = {
  version: 1;
  boundaries: Boundary[];
  meals: Meal[];
  bought: Record<string, boolean>;
  templates: WeekTemplate[];
  updatedAt: string;
};

export type ListItem = {
  key: string;
  text: string;
  count: number;
  bought: boolean;
};

export type BoundaryList = {
  boundary: Boundary;
  items: ListItem[];
};

export type SharePayload = {
  version: 1;
  listId: string;
  boundary: Pick<Boundary, 'name' | 'symbol' | 'color'>;
  weekStart: string;
  generatedAt: string;
  items: Array<Pick<ListItem, 'text' | 'count'>>;
};
