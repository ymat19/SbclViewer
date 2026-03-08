# 開発環境

## NixOS ファイアウォール

NixOS ファイアウォールが有効（`networking.firewall.enable = true`）。
LAN 別端末からポートにアクセスできない場合、まずこれを疑う。

```bash
# 一時的に開放
sudo iptables -I INPUT -p tcp --dport <PORT> -j ACCEPT
```

SSH は `services.openssh.enable` で自動許可されるが、他ポートは明示開放が必要。
