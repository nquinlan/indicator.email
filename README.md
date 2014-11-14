# indicator.email

![Inbox Status •](assets/indicators/good.svg) ![Inbox Status •](assets/indicators/okay.svg) ![Inbox Status •](assets/indicators/bad.svg)

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