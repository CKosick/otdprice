# OTD Price — State Tax & Fees Dataset

This directory contains the static tax and fee datasets for the **OTD Price** Chrome extension.

The current dataset consists of **research-compiled baseline estimates** compiled from state DMV/Department of Revenue vehicle tax rates, statutory dealer doc fee caps, and typical industry benchmarks.

## Swapping with CarTaxHub Data
To update or swap this dataset with Cliff's official CarTaxHub export:
1. Replace `state-tax-rates.json` with the updated JSON file.
2. Ensure the JSON follows the schema below.
3. Update `tax-data.js` to match.

## Schema
```json
{
  "version": "2026.1",
  "source": "Research-compiled baseline dataset",
  "updatedAt": "2026-10-06",
  "notes": "...",
  "states": {
    "STATE_CODE": {
      "name": "State Name",
      "rate": 0.0625,
      "docFee": 150,
      "docFeeCapped": false,
      "docFeeCapAmount": null,
      "titleReg": 135,
      "notes": "..."
    }
  }
}
```

## Zero Remote Calls
The extension never fetches tax rates from external servers. All tax calculations are executed locally on the client's browser using this bundled asset.
