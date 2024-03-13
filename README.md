# DEPRECATED 
Do not use in new projects.

#### Fork of [@kohsuke/ajaxterm4j](https://github.com/kohsuke/ajaxterm4j) version, replaced ajax with WebSocket. 
Original author Antony Lesuisse [Ajaxterm](http://antony.lesuisse.org/software/ajaxterm/HEADER.html).

Ajaxterm was written by Antony Lesuisse (email: al AT udev.org), License Public Domain.

#### Usage

Specify WebSocket endpoint

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Terminal</title>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <link rel="stylesheet" type="text/css" href="index.css">
    <script src="index.js"></script>
</head>
<body style="background-color:#888">
<div id="term" class="ajaxterm"></div>
<script>
    window.onload = function () {
        function getEndpoint() {
            const loc = document.location;
            const host = loc.hostname;
            const port = loc.port;
            const ws_protocol = loc.protocol === 'https:' ? 'wss' : 'ws';
            return `${ws_protocol}://${host}:${port}/`
        }

        ajaxterm.terminal('term', {
            width: window.innerWidth,
            height: window.innerHeight,
            getEndpoint: getEndpoint
        });
    };
</script>
</body>
</html>
```
