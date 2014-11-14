# [indicator.email](http://indicator.email) <img alt="Inbox Status •" src="assets/indicators/good.png?raw=true" width="99" height="20" /> <img alt="Inbox Status •" src="assets/indicators/okay.png?raw=true" width="99" height="20" /> <img alt="Inbox Status •" src="assets/indicators/bad.png?raw=true" width="99" height="20" />

_A status light for your email._

## Get Your Own

[indicator.email](http://indicator.email) is available at its domain, however if you would like your own instance, it's relatively easy to deploy `indicator.email`.

`indicator.email` is written to be run on Heroku, which makes deployment rather simple. To do so, you may use the button below:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/nquinlan/indicator.email/tree/master)

If you'd prefer to do it manually, this is rather simple too.

### Clone the Repo
```sh
git clone https://github.com/nquinlan/indicator.email.git
cd indicator.email
```

### Create a Heroku App
To do this, you'll need the [heroku toolbelt](https://toolbelt.heroku.com/).

```sh
heroku create
```

### Add the necessary add-ons

```sh
heroku addons:add iron_worker:lite
heroku addons:add mongolab:sandbox
```

You may also use Compose MongoHQ without issue.

### <a name="env-variables"></a> Setup Environment Variables
The app needs a few environment variables to run.

#### Google Credentials
You'll need a Google App with OAuth Credentials. You may find these in [the Google Developer Console](https://console.developers.google.com/).

```sh
heroku config:set                       \
GOOGLE_CLIENT_ID=your_client_id         \
GOOGLE_CLIENT_SECRET=your_client_secret \
GOOGLE_REDIRECT_URL=your_redirect_url
```

_Replace `your_client_id`, `your_client_secret`, and `your_redirect_url` with the ones you've provided Google. (`your_redirect_url` should be `https://YOUR-APP-NAME.herokuapp.com/oauth/google`)_

#### API Keys
`indicator.email` has an API that uses internally, and you may want to use externally. You must setup an API token for it.

```sh
heroku config:set           \
API_CLIENT_ID=your_api_user \
API_CLIENT_SECRET=your_api_key
```

_Replace `your_api_user` and `your_api_key` with random strings, or anything you feel is secure._

#### General Config

```
sh config:set \
INDICATOR_CACHE_TIME=360000
```

| Name | Description |
|:----:|:------------|
| `INDICATOR_CACHE_TIME` | The time clients should cache indicators (in milliseconds). |

### Push Your Code

```
git push heroku master
```

### Post Deploy
`indicator.email` relies on an [iron worker](http://www.iron.io/worker) to regularly check inboxes. You must deploy that iron worker. 
 
```
heroku run mkdir /tmp/gems/; export GEM_HOME="/tmp/gems"; gem install iron_worker_ng; cd helpers/iron_worker; /tmp/gems/bin/iron_worker upload poll
``` 


## Development

If you wish to develop `indicator.email`, currently the code is a hot mess, but that shouldn't stop you!

### Requirements
`indicator.email` requires [node](http://nodejs.org), [mongodb](http://mongodb.org) and [Iron.io](http://iron.io/).

### Clone the Repo
```sh
git clone https://github.com/nquinlan/indicator.email.git
cd indicator.email
```

### Install all the dependencies

```sh
npm install
```

### Configure Environment Variables

```sh
cp .env.example .env
edit .env
```

Set the environment variables as merited. An explanation of [some is above in the heroku config](#env-variables). `MONGO_DB_URL` should work if your `mongod` has standard config, if not, change it. Additionally, you'll need an `IRON_WORKER_TOKEN` and `IRON_WORKER_PROJECT_ID` these can be procured from [Iron.io's Dashboard/HUD](https://hud.iron.io/).

Once you've configured them, source that file so you can have access to the variables at all times.

```
source .env
```

### Upload your Iron Worker
To upload the  [iron worker](http://www.iron.io/worker), you'll need the [iron_worker cli](http://dev.iron.io/worker/reference/cli/). This can be procured by doing `gem install iron_worker_ng`.

```
cd helpers/iron_worker
iron_worker upload poll
cd ../..
```

### Start the app!
The app can now be started! :smiley:

```sh
npm start
```

### Generate PNGs from SVGs
Although they're currently generated, you _may_ at some point want to regenerate the indicator PNGs. To do this, you'll need [ImageMagick](http://www.imagemagick.org/) and (ideally) the font [DejaVu Sans](http://dejavu-fonts.org/wiki/Main_Page). **This is not a required step.**

```sh
mogrify -magnify -format png assets/indicators/*.svg
```


## Credit

- Indicator Icon created from the [Shields.io Format](https://github.com/badges/shields) - Licensed: [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en)
- Clipboard Icon from [Hawcons](http://hawcons.com/) - Licensed: _You are free to use Hawcons for commercial and personal purposes without attribution, however a credit for the work would be appreciated. You may not sell or redistribute the icons themselves as icons. Do not claim creative credit. _

### Contributors

- [nquinlan](https://github.com/nquinlan)
- [motdotla](https://github.com/motdotla)

### License
Unless otherwise specified this work is licensed MIT.

```
The MIT License (MIT)

Copyright (c) 2014 Nick Quinlan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```