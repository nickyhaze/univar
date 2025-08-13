# `univar`

[![npm version](https://img.shields.io/npm/v/univar.svg)](https://www.npmjs.com/package/univar)
![NPM License](https://img.shields.io/npm/l/univar)
## Overview

`univar` lets you use **one script syntax** for environment variables that works on **macOS/Linux (bash)** and **Windows (cmd)**. It replaces `$VAR` and `%VAR%` placeholders in your commands before execution.

Without `univar`, these scripts behave differently:

```jsonc
{
  "scripts": {
    "bash-only": "echo Hello $USER",
    "win-only": "echo Hello %USERNAME%"
  }
}
```

With `univar`, they can be unified:

```jsonc
{
  "scripts": {
    "greet": "univar echo Hello $USER %USERNAME%"
  }
}
```

On any platform:
```bash
npm run greet
# → Hello JaneDoe JaneDoe
```

## Install
```bash
npm install univar --save-dev
```

## Usage

```jsonc
{
  "scripts": {
    "prebuild": "univar rimraf public/$npm_package_version",
    "build": "univar echo Building v$npm_package_version for %USERNAME%"
  }
}
```

## Dev
```bash
npm test
```
