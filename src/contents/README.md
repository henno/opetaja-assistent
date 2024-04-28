# contents/ directory

This is the directory for the content scripts that will be injected into the webpages.

Each content script should export a `config` object that must specify the URLs that the content script will run on

```javascript
export const config: PlasmoCSConfig = {
  matches: ["https://www.plasmo.com/*"]
}
```

Failing to specify the URLs will result in the content script being loaded on every website!
