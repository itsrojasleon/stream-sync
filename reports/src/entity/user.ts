import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
// We could also extend BaseEntity here, but it's optional.
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
}
