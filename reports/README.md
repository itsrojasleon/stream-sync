# Reports

To install dependencies:

```bash
bun install
```

## Deployment

```shell
bun run deploy
```

## Destroy

```shell
bun run destroy
```

## SSH Tunnel

```shell
ssh -i ~/downloads/ec2-key-pair.pem -L dbport:dbname.us-east-1.rds.amazonaws.com:5432 ec2-user@publicIp -N
```
