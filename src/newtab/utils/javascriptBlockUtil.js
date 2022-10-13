export function jsContentHandler($blockData, $preloadScripts, $automaScript) {
  return new Promise((resolve, reject) => {
    try {
      let $documentCtx = document;

      if ($blockData.frameSelector) {
        const iframeCtx = document.querySelector(
          $blockData.frameSelector
        )?.contentDocument;

        if (!iframeCtx) {
          reject(new Error('iframe-not-found'));
          return;
        }

        $documentCtx = iframeCtx;
      }

      const scriptAttr = `block--${$blockData.id}`;

      const isScriptExists = $documentCtx.querySelector(
        `.automa-custom-js[${scriptAttr}]`
      );
      if (isScriptExists) {
        resolve('');
        return;
      }

      const script = document.createElement('script');
      script.setAttribute(scriptAttr, '');
      script.classList.add('automa-custom-js');
      script.textContent = `(() => {
        ${$automaScript}

        try {
          ${$blockData.data.code}
          ${
            $blockData.data.everyNewTab ||
            $blockData.data.code.includes('automaNextBlock')
              ? ''
              : 'automaNextBlock()'
          }
        } catch (error) {
          console.error(error);
          ${
            $blockData.data.everyNewTab
              ? ''
              : 'automaNextBlock({ $error: true, message: error.message })'
          }
        }
      })()`;

      const preloadScriptsEl = $preloadScripts.map((item) => {
        const scriptEl = document.createElement('script');
        scriptEl.id = item.id;
        scriptEl.textContent = item.script;

        $documentCtx.head.appendChild(scriptEl);

        return { element: scriptEl, removeAfterExec: item.removeAfterExec };
      });

      if (!$blockData.data.everyNewTab) {
        let timeout;
        let onNextBlock;
        let onResetTimeout;

        /* eslint-disable-next-line */
        function cleanUp() {
          script.remove();
          preloadScriptsEl.forEach((item) => {
            if (item.removeAfterExec) item.script.remove();
          });

          clearTimeout(timeout);

          $documentCtx.body.removeEventListener(
            '__automa-reset-timeout__',
            onResetTimeout
          );
          $documentCtx.body.removeEventListener(
            '__automa-next-block__',
            onNextBlock
          );
        }

        onNextBlock = ({ detail }) => {
          cleanUp(detail || {});
          resolve({
            columns: {
              data: detail?.data,
              insert: detail?.insert,
            },
            variables: detail?.refData?.variables,
          });
        };
        onResetTimeout = () => {
          clearTimeout(timeout);
          timeout = setTimeout(cleanUp, $blockData.data.timeout);
        };

        $documentCtx.body.addEventListener(
          '__automa-next-block__',
          onNextBlock
        );
        $documentCtx.body.addEventListener(
          '__automa-reset-timeout__',
          onResetTimeout
        );

        timeout = setTimeout(cleanUp, $blockData.data.timeout);
      } else {
        resolve();
      }

      $documentCtx.head.appendChild(script);
    } catch (error) {
      console.error(error);
    }
  });
}