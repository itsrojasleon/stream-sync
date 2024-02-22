import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  email!: string;

  @Column('int')
  age!: number;

  @Column('varchar')
  company!: string;

  // @Column('varchar')
  // @Index('country_idx') // B-tree index
  // country!: string;
}
