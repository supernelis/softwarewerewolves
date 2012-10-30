softwarewerewolves
==================

Simpele XMMP implementatie van softwarewerewolves.

To run on Mac OS X:

1. download and install node
2. download and install Xcode
3. download and install MacPorts
4. install icu headers with MacPorts <pre><code>sudo port install icu +devel</code></pre>
5. install node-stringprep <pre><code>npm install node-stringprep</code></pre>
6. install node-xmpp <pre><code>npm install node-xmpp</code></pre>

For tests `should` and `mocha` are used. Install with

    $ npm install should
    $ npm install mocha

To run the tests, make sure that `mocha` is in your path, cd into the git repository and run

    $ mocha