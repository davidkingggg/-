import assert from 'node:assert/strict'
import { extractFirstSpecNumber, sortQuoteCompareGroups, type QuoteCompareSortMode } from '../lib/quote-compare-sort'

function groups() {
  return [
    {
      compareKey: '阀门-DN100-截止阀',
      productName: 'DN100截止阀',
      model: 'J41H-16C DN100',
      minPrice: 520,
      maxPrice: 680,
      items: [
        { id: 'a', compareKey: '阀门-DN100-截止阀', productName: 'DN100截止阀', model: 'J41H-16C DN100', price: 680 },
        { id: 'b', compareKey: '阀门-DN100-截止阀', productName: 'DN100截止阀', model: 'J41H-16C DN100', price: 520 },
      ],
    },
    {
      compareKey: '阀门-DN50-法兰球阀',
      productName: 'DN50法兰球阀',
      model: 'Q41F-16C DN50',
      minPrice: 285,
      maxPrice: 300,
      items: [
        { id: 'c', compareKey: '阀门-DN50-法兰球阀', productName: 'DN50法兰球阀', model: 'Q41F-16C DN50', price: 300 },
        { id: 'd', compareKey: '阀门-DN50-法兰球阀', productName: 'DN50法兰球阀', model: 'Q41F-16C DN50', price: 285 },
      ],
    },
    {
      compareKey: '阀门-DN80-蝶阀',
      productName: 'DN80蝶阀',
      model: 'D71X-16 DN80',
      minPrice: 180,
      maxPrice: 220,
      items: [
        { id: 'e', compareKey: '阀门-DN80-蝶阀', productName: 'DN80蝶阀', model: 'D71X-16 DN80', price: 220 },
        { id: 'f', compareKey: '阀门-DN80-蝶阀', productName: 'DN80蝶阀', model: 'D71X-16 DN80', price: 180 },
      ],
    },
  ]
}

function sortedKeys(mode: QuoteCompareSortMode) {
  return sortQuoteCompareGroups(groups(), mode).map((group) => group.compareKey)
}

assert.equal(extractFirstSpecNumber('阀门-DN50-法兰球阀'), 50)
assert.equal(extractFirstSpecNumber('D71X-16 DN80'), 80)
assert.deepEqual(sortedKeys('priceAsc'), ['阀门-DN80-蝶阀', '阀门-DN50-法兰球阀', '阀门-DN100-截止阀'])
assert.deepEqual(sortedKeys('priceDesc'), ['阀门-DN100-截止阀', '阀门-DN50-法兰球阀', '阀门-DN80-蝶阀'])
assert.deepEqual(sortedKeys('paramAsc'), ['阀门-DN50-法兰球阀', '阀门-DN80-蝶阀', '阀门-DN100-截止阀'])
assert.deepEqual(sortedKeys('paramDesc'), ['阀门-DN100-截止阀', '阀门-DN80-蝶阀', '阀门-DN50-法兰球阀'])

const priceSorted = sortQuoteCompareGroups(groups(), 'priceAsc')
assert.deepEqual(priceSorted[0].items.map((item) => item.price), [180, 220])

console.log('quote compare sorting tests passed')
