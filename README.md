# indicator.email


## Setup

```
cp .env.example .env
```

Set your settings there. Get your [Google Credentials here](https://console.developers.google.com/).

To generate the indicator `pngs` from `svgs` use the following command:

```sh
mogrify -magnify -format png assets/indicator/*.svg
```