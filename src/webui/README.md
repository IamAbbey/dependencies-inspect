# WebUI

## Technologies
- React
- Vite
- Scadcn UI
- Zustand
- Valibot

You must configure the inspect command to point to your own React build output. To achieve this, you can set the `WEB_UI_BUILD_DIR` environment variable and provide the **absolute** path to your build directory.

```sh
export WEB_UI_BUILD_DIR="/home/user/custom-webui/dist"
```

You can copy the generated `window.webUIData` data in `<output_dir>/index.html` to `src/webui/dev.html` - This just needs to done whenever you needed an updated data to work with in `src/webui`
