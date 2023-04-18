#!/usr/bin/env -S npx ts-node

import chalk from 'chalk'
import emoji from 'node-emoji'
import { z } from 'zod';

type Tuple = [any, ...any]

const ipPair: RegExp =
  /^[0-9A-Fa-f]{1,4}$/;
const ipV4Pattern =
  /^((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([1-9][0-9])|[0-9])(\.((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([1-9][0-9])|[0-9])){3}$/u;

const parsePossibleIpString = (value: string) => {
  // Split on the ':', results in some empty strings with compact.
  const parts = value.split(':')

  // Trim if leading empty string, leading zeros in compact.
  if (parts[0] === '') {
    parts.shift()
  }

  // Trim if trailing empty string, trailing zeros in compact.
  if (parts[parts.length - 1] === '') {
    parts.pop()
  }

  // Split if compact. Will only preduce one or two results.
  const sep = parts.indexOf('')
  if (sep >= 0) {
    // We add a zero to the second array to simply compact form logic.
    // This is because the extra zero can stand for the at least one
    // missing pair in the compact form.
    return [parts.slice(0, sep), ['0', ...parts.slice(sep + 1)]] satisfies Tuple
  } else {
    return [parts] satisfies Tuple
  }
}

const isValidFullIp = (value: string[]) => {
  const last = value.pop()

  // IPv4 translation.
  if (ipV4Pattern.test(last ?? '')) {
    return value.length === 6 &&
      value.every(p => ipPair.test(p))
  }

  // IPv6, only 7 since we pop'ped the last.
  return value.length === 7 &&
    value.every(p => ipPair.test(p)) &&
    ipPair.test(last ?? '')
}

const isValidCompactIp = ([left, right]: [string[], string[]]) => {
  // Undefind if right is empty.
  const last = right.pop()

  // IPv4 translation, won't test on an empty right.
  if (ipV4Pattern.test(last ?? '')) {
    return (left.length + right.length) <= 6 &&
      left.every(p => ipPair.test(p)) &&
      right.every(p => ipPair.test(p))
  }

  // IPv6, only 7 since we pop'ed the last.
  // Empty arrays won't have anything to
  // test and are valid as zero leading.
  return (left.length + right.length) <= 7 &&
    left.every(p => ipPair.test(p)) &&
    right.every(p => ipPair.test(p)) &&
    ipPair.test(last ?? '')
}

const isValidIp = (value: unknown) => {
  if (value === '::') {
    // Zero address short-circuit.
    return true
  }

  if (typeof value !== 'string') {
    return false;
  }

  const parts = parsePossibleIpString(value)
  if (parts.length === 1) {
    return isValidFullIp(parts[0])
  }

  return isValidCompactIp(parts)
}

const stringify = (value: unknown) => {
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'undefined') return 'undefined'
  return JSON.stringify(value)
}

type TestData = [unknown, boolean]

const ipV6Tests: TestData[] = [
  // Invalid, wrong types
  [true, false],
  [false, false],
  [null, false],
  [undefined, false],
  [{ }, false],
  [[], false],
  [Symbol(), false],
  [0, false],
  [0n, false],
  // Invalid, not even close
  ['', false],
  ['def not valid', false],
  // Invalid, too many colons
  [':::', false],
  ['FF:::', false],
  [':::FF', false],
  // Invalid, not enough parts
  ['FF:FF:FF:FF', false],
  ['FF:FF:FF:FF:192.168.0.1', false],
  // Invalid, too many parts
  ['11:22:33:44:55:66:77:88::', false],
  ['::88:99:AA:BB:CC:DD:EE:FF', false],
  ['11:22:33:44:55:66::192.168.0.1', false],
  ['::AA:BB:CC:DD:EE:FF:192.168.0.1', false],
  // Invalid, bad pairs
  ['G111:22:33:44:55:66:77:88', false],
  ['88:99:AA:BB:CC:DD:EE:7FFFF', false],
  // Valid, zero address
  ['::', true],
  // Valid, zero leading IPv4
  ['::192.168.0.4', true],
  // Valid, trailing zero
  ['11::', true],
  ['11:22::', true],
  ['11:22:33::', true],
  ['11:22:33:44::', true],
  ['11:22:33:44:55::', true],
  ['11:22:33:44:55:66::', true],
  ['11:22:33:44:55:66:77::', true],
  // Valid, leading zero, with hex digit checks.
  ['::FF', true],
  ['::EE:FF', true],
  ['::DD:EE:FF', true],
  ['::CC:DD:EE:FF', true],
  ['::BB:CC:DD:EE:FF', true],
  ['::AA:BB:CC:DD:EE:FF', true],
  ['::99:AA:BB:CC:DD:EE:FF', true],
  // Valid, IPv4 with trailing zero
  ['11::192.168.0.1', true],
  ['11:22::192.168.0.1', true],
  ['11:22:33::192.168.0.1', true],
  ['11:22:33:44::192.168.0.1', true],
  ['11:22:33:44:55::192.168.0.1', true],
  // Valid, IPv4 with leading zero
  ['::FF:192.168.0.1', true],
  ['::EE:FF:192.168.0.1', true],
  ['::DD:EE:FF:192.168.0.1', true],
  ['::CC:DD:EE:FF:192.168.0.1', true],
  ['::BB:CC:DD:EE:FF:192.168.0.1', true],
  // Valid, compact, with hex length checks.
  ['1::333:4444:55:66:77:88', true],
  ['1:22::4444:55:66:77:88', true],
  ['1:22:333::55:66:77:88', true],
  ['1:22:333:4444::66:77:88', true],
  ['1:22:333:4444:55::77:88', true],
  ['1:22:333:4444:55:66::88', true],
  ['11::33:44:55:66:77', true],
  ['11:22::44:55:66:77', true],
  ['11:22:33::55:66:77', true],
  ['11:22:33:44::66:77', true],
  ['11:22:33:44:55::77', true],
  ['11::33:44:55:66', true],
  ['11:22::44:55:66', true],
  ['11:22:33::55:66', true],
  ['11:22:33:44::66', true],
  ['11::33:44:55', true],
  ['11:22::44:55', true],
  ['11:22:33::55', true],
  ['11::33:44', true],
  ['11:22::44', true],
  ['11::33', true],
  // Valid, compact IPv4, zero pair check.
  ['11::33:44:0:66:192.168.0.3', true],
  ['11:22::44:0:66:192.168.0.3', true],
  ['11:22:33::0:66:192.168.0.3', true],
  ['11:22:33:44::66:192.168.0.3', true],
  ['11::33:44:00:192.168.0.3', true],
  ['11:22::44:00:192.168.0.3', true],
  ['11:22:33::00:192.168.0.3', true],
  ['11::33:44:192.168.0.3', true],
  ['11:22::44:192.168.0.3', true],
  ['11::33:192.168.0.3', true],
];

const unitTest = (name: string, data: TestData[], check: (value: unknown) => boolean) => {
  console.log(chalk.whiteBright(`=== ${name} ===`))

  let passes = 0
  let fails = 0
  for (const [input, expected] of data) {
    const value = stringify(input)
    const valid = check(input)
    const pass = valid === expected
    passes += +pass
    fails += +!pass

    const log = pass
      ? valid
        ? [emoji.get('white_check_mark'), chalk.whiteBright(value), '=>', chalk.greenBright(valid)]
        : [emoji.get('white_check_mark'), chalk.white(value), '=>', chalk.redBright(valid)]
      : [emoji.get('x'), chalk.redBright(value, '=>', valid)]

    console.log(...log)
  }

  const status = fails === 0
    ? [emoji.get('smiley'), chalk.greenBright(`${passes} pass`), `${fails} fail`]
    : [emoji.get('heavy_exclamation_mark'), `${passes} pass`, chalk.redBright(`${fails} fail`)]

  console.log(...status)
}

unitTest('zod: IPv6', ipV6Tests, value => z.string().ip({ version: 'v6' }).safeParse(value).success)
unitTest('new: IPv6', ipV6Tests, isValidIp)

const ipV4Test: TestData[] = [
  // Invalid, wrong types
  [true, false],
  [false, false],
  [null, false],
  [undefined, false],
  [{ }, false],
  [[], false],
  [Symbol(), false],
  [0, false],
  [0n, false],
  // Fail, not even close
  ['', false],
  ['def not valid', false],
  ['192', false],
  ['192.', false],
  ['.168.0', false],
  // Fail, too short or long
  ['192.168.0', false],
  ['192.168.0.2.8', false],
  // Fail, out of range
  ['192.168.0.259', false],
  // Fail, octal
  ['0192.168.0.2', false],
  ['192.168.00.2', false],
  ['192.168.0.02', false],
  // Pass, zero and full
  ['0.0.0.0', true],
  ['255.255.255.255', true],
  // Pass
  ['192.168.0.2', true],
  ['255.168.0.2', true],
  ['192.255.0.2', true],
  ['192.0.0.2', true],
]

unitTest('zod: IPv4', ipV4Test, value => z.string().ip({ version: 'v4' }).safeParse(value).success)
unitTest('new: IPv4', ipV4Test, value => z.string().regex(ipV4Pattern).safeParse(value).success)
