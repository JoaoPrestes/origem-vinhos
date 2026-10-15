export interface Repository<TEntity = any, TCreateInput = any, TUpdateInput = any> {
  findById?(id: string, ...args: any[]): Promise<TEntity | null>;
  create?(data: TCreateInput): Promise<TEntity>;
  update?(id: string, ...args: any[]): Promise<TEntity>;
  delete?(id: string, ...args: any[]): Promise<boolean>;
}
