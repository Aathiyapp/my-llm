# Restore administrator access

The `/admin` screen's 403 means the signed-in Firebase Auth UID is not the UID in the `BUBBLI_SUPER_ADMIN_UID` Functions secret. This is an authorization configuration problem; the client cannot safely grant itself access.

## Initial Super Admin

1. In Firebase Console → Authentication → Users, identify the intended administrator account and copy its UID. Confirm the Firebase project is `affiliate-93078` (the project selected by this repository's `.firebaserc`).
2. From this repository, set the Functions secret to that UID:

   ```powershell
   firebase functions:secrets:set BUBBLI_SUPER_ADMIN_UID --project affiliate-93078
   ```

   Enter the UID at the CLI prompt. Do not commit it or put it in a browser environment variable.
3. Deploy the callable that consumes the secret:

   ```powershell
   firebase deploy --only functions:claimInitialSuperAdmin --project affiliate-93078
   ```

4. Sign in as that exact account, visit `/admin`, and choose **Provision initial Super Admin**. The callable verifies the UID server-side, creates a one-time bootstrap record, and sets the Auth custom claim.

If the callable reports that a Super Admin is already provisioned, sign in as that existing administrator and grant the intended account the `admin` role from the Users tab. If no existing admin can sign in, use a trusted Admin SDK environment with the project's service account to set the custom claim after verifying the operator's identity; never add a public client-side role switch or open admin reads in Firestore rules.

## Storefront fetch failures

The storefront now shows a useful Firebase error category. For `permission-denied`, deploy the repository's current Firestore rules to the same Firebase project used by the deployed web app:

```powershell
firebase deploy --only firestore:rules --project affiliate-93078
```

For `failed-precondition`, inspect Firestore → Indexes and the browser console for the exact query/index name. Check that no unintended `maintenanceMode` is enabled in `platformConfig/public` and that the requested creator profile remains published and is not suspended.
