# indicator.email <img alt="Inbox Status •" src="assets/indicators/good.png?raw=true" width="99" height="20" /> <img alt="Inbox Status •" src="assets/indicators/okay.png?raw=true" width="99" height="20" /> <img alt="Inbox Status •" src="assets/indicators/bad.png?raw=true" width="99" height="20" />

## Setup

```sh
cp .env.example .env
```

Set your settings there. Get your [Google Credentials here](https://console.developers.google.com/).

To deploy to Heroku you'll need the following addons
```
heroku addons:add iron_worker:lite
heroku addons:add mongolab:sandbox
```

To get the iron worker deployed you'll need 
```
heroku run mkdir /tmp/gems/; export GEM_HOME="/tmp/gems"; gem install iron_worker_ng; cd helpers/iron_worker; /tmp/gems/bin/iron_worker upload poll
```

To generate the indicator `pngs` from `svgs` use the following command:

```sh
mogrify -magnify -format png assets/indicators/*.svg
```

## Credit

- Indicator Icon created from the [Shields.io Format](https://github.com/badges/shields)
- Clipboard Icon from [Hawcons](http://hawcons.com/)