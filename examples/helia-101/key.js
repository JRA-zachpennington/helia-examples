import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { ipns } from '@helia/ipns'
import { dht, pubsub } from '@helia/ipns/routing'
import { unixfs } from '@helia/unixfs'
import { bootstrap } from '@libp2p/bootstrap'
import { tcp } from '@libp2p/tcp'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'
import { floodsub } from '@libp2p/floodsub'



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
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
                ]
            })
        ],
        services: {
            pubsub: floodsub(),
            identify: identifyService()
        }
    })

    return await createHelia({
        datastore,
        blockstore,
        libp2p
    })
}

const helia = await createNode()

// const helia = await createHelia()
const name = ipns(helia, [
    dht(helia),
    pubsub(helia)
])

// create a public key to publish as an IPNS name
const keyInfo = await helia.libp2p.keychain.createKey('my-key', 'RSA', 4096)
// const keyInfo = await helia.libp2p.keychain.importKey("my-key", pem, "sueshe");
const peerId = await helia.libp2p.keychain.exportPeerId(keyInfo.name)

// store some data to publish
const fs = unixfs(helia)
const cid = await fs.addBytes((new TextEncoder()).encode("Hello"))

// const sleep = async () => {
//     return new Promise((resolve) => {
//         setTimeout(resolve, 3000);
//     });
// }
// await sleep();

// publish the name
await name.publish(peerId, cid)
console.log("published", peerId, cid);

// resolve the name
const cidResolved = name.resolve(peerId)
