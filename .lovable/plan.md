# Plan: Implementation of 3-Way Payment Split (Coletivos)

Implement the second stage of the "Coletivos" feature, enabling automatic payment splits between ViuFoto (Platform), the Collective Owner, and the Photographer.

## Technical Details

### 1. Database Schema Reference
- `events.coletivo_id`: Links an event to a collective.
- `coletivos.owner_asaas_wallet_id`: The wallet receiving the collective's commission.
- `coletivo_members.commission_pct`: The percentage defined by the collective owner for each member.

### 2. Edge Function Update (`supabase/functions/asaas-payment/index.ts`)
The `create_checkout` action will be enhanced to:
1.  **Fetch Collective Context**: If the event has a `coletivo_id`, retrieve the collective's owner wallet and the photographer's specific commission rate within that collective.
2.  **Validation**:
    - Ensure the photographer is an `ativo` member of the collective.
    - Check if the collective owner has a valid `asaas_wallet_id`.
3.  **Calculation Logic**:
    - `platformFee`: Calculated based on the event's plan type (e.g., 10%).
    - `coletivoFee`: Calculated as `total * (commission_pct / 100)`.
4.  **Split Construction**:
    - Construct an array for Asaas with up to 3 recipients.
    - Handle edge cases:
        - If photographer is the collective owner, only split with ViuFoto.
        - If collective owner's wallet is missing, skip collective split (log warning).
        - If collective owner's wallet is same as ViuFoto, combine fees.

### 3. Frontend Validations (Optional but recommended)
- Verify if `CreateEvent` and `EditEvent` correctly ensure that events linked to coletivos can only be organized by active members. (Already partially implemented in Etapa 1, will verify).

## Proposed Changes

### Edge Function
- **File**: `supabase/functions/asaas-payment/index.ts`
- **Logic**:
    - Update the `events` query to include `coletivo_id`.
    - Add logic to fetch `coletivo_members` and `coletivos` data.
    - Refactor split calculation to support 3 destinations.
    - Add robust logging for debugging split distributions.

## Verification Plan
1.  **Unit Logic**: Verify the commission math (ensuring rounding to 2 decimal places).
2.  **Simulation**: Use manual database inserts to link an event to a collective and test the `asaas-payment` function locally/in preview.
3.  **Logs**: Check `DEBUG_PAYLOAD` logs to ensure the split array contains the expected wallet IDs and values.
