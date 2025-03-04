/* eslint-disable no-console */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { unixfs } from '@helia/unixfs'
import { bootstrap } from '@libp2p/bootstrap'
import { tcp } from '@libp2p/tcp'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'
import { multiaddr } from '@multiformats/multiaddr'


async function createNode() {
  // the blockstore is where we store the blocks that make up files
  const blockstore = new MemoryBlockstore()

  // application-specific data lives in the datastore
  const datastore = new MemoryDatastore()

  // libp2p is the networking layer that underpins Helia
  const libp2p = await createLibp2p({
    datastore,
    addresses: {
      listen: [
        '/ip4/127.0.0.1/tcp/0'
      ]
    },
    transports: [
      tcp()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star'
        ]
      })
    ],
    services: {
      identify: identifyService()
    }
  })

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}

// create two helia nodes
const node1 = await createNode()
const node2 = await createNode()

// connect them together
const multiaddrs = node2.libp2p.getMultiaddrs()
console.log("getMultiaddrs", multiaddrs);
await node1.libp2p.dial(multiaddrs[0])
await node1.libp2p.dial(multiaddr("/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWJhn8WgABUDtPm954sYF3jLJc8oy2tjfm1Pt31wZc8kzV"));
await node2.libp2p.dial(multiaddr("/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWJhn8WgABUDtPm954sYF3jLJc8oy2tjfm1Pt31wZc8kzV"));

const peers = node1.libp2p.getPeers();
console.log("peers", peers);

// create a filesystem on top of Helia, in this case it's UnixFS
const fs = unixfs(node1)

// we will use this TextEncoder to turn strings into Uint8Arrays
const encoder = new TextEncoder()

// add the bytes to your node and receive a unique content identifier
const cid = await fs.addBytes(encoder.encode('Hello World ZPP@'))

console.log('Added file:', cid.toString())

// create a filesystem on top of the second Helia node
const fs2 = unixfs(node2)

// this decoder will turn Uint8Arrays into strings
const decoder = new TextDecoder()
let text = ''

// use the second Helia node to fetch the file from the first Helia node
for await (const chunk of fs2.cat(cid)) {
  text += decoder.decode(chunk, {
    stream: true
  })
}

console.log('Fetched file contents:', text)


text = ''
// use the second Helia node to fetch the file from the first Helia node
for await (const chunk of fs2.cat("QmVQi48ntcJAEndqoDb24QyYEYhKmUZaHK9n8ECUhTtwzF")) {
  text += decoder.decode(chunk, {
    stream: true
  })
}

console.log('Fetched file contents:', text)
