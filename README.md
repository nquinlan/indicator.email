# indicator.email


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
```

To generate the indicator `pngs` from `svgs` use the following command:

```sh
mogrify -magnify -format png assets/indicator/*.svg
```