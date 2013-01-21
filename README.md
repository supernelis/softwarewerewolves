softwarewerewolves
==================

Simpele XMPP implementatie van softwarewerewolves.

To run on Mac OS X:

1. download and install node
2. download and install Xcode
3. download and install MacPorts
4. install icu headers with MacPorts <pre><code>sudo port install icu +devel</code></pre>
5. install node-stringprep <pre><code>npm install node-stringprep</code></pre>
6. install node-xmpp <pre><code>npm install node-xmpp</code></pre>

For tests `should` and `mocha` are used. Install the former as follows

    $ npm install should

Use sudo to install `mocha` to be sure that `npm` creates a link in `/usr/local/bin`

    $ sudo npm install mocha

To run the tests, make sure that `mocha` is in your path, cd into the git repository and run

    $ mocha
    
Or, even better, use the --watch and --reporter options:

    $ mocha --reporter spec --watch

The examples directory shows how to use the library. `jabber_example.js` sets up a game co-ordinated by some bots connecting to the jabber.org XMPP server. To run from your git repository 

    $ node examples/jabber_example.js
