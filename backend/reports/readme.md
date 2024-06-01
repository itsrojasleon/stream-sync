# Reports

## Installation

```bash
bun install
```

## Connection to RDS locally

We will create a SSH tunnel from our local machine to the RDS instance

```shell
ssh -i ~/path/to/your/ec2-key-pair.pem -L <localPort>:dbname.us-east-1.rds.amazonaws.com:<rdsRemotePort> ec2-user@instancePublicIp -N

# The -N flag tells SSH that we don't want to execute a remote command. We just want to forward the port.

# E.g.
ssh -i ~/path/to/your/ec2-key-pair.pem -L 5432:dbname.us-east-1.rds.amazonaws.com:5432 ec2-user@52.52.52.524 -N
```

Open a new terminal window and run:

```shell
psql -h localhost -p <dbPort> -U postgres
# Then enter the password.

# E.g.
psql -h localhost -p 5432 -U postgres
# $ password
```

## Deployment

```shell
bun run deploy
```

## Migrations

### Generate a new migration

Following commadn will generate a new migration file in `src/migrations` folder. Those files will contain the necessary SQL code built automatically by TypeORM to update the database.

```shell
bun run typeorm -- migration:generate src/migrations/nameOfYourMigration
```

### Run migrations

```shell
bun run typeorm -- migration:run
```

## Destroy

```shell
bun run destroy
```
