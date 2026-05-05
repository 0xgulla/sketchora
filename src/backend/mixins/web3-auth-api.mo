import Debug "mo:core/Debug";
import Map "mo:core/Map";
import Types "../types/web3-auth";
import Web3AuthLib "../lib/web3-auth";

/// Public API mixin for SIWE authentication.
/// Receives the three state maps as constructor arguments.
mixin (
  users : Types.Users,
  nonces : Types.Nonces,
  sessions : Types.Sessions,
) {

  /// Generate and store a fresh nonce for the given Ethereum wallet address.
  /// The nonce is valid for 5 minutes.  This is an update call because it
  /// writes to the nonces map.
  public func generateNonce(walletAddress : Text) : async Text {
    Debug.todo()
  };

  /// Verify a SIWE signature flow:
  ///   1. Validate the nonce exists and is fresh for the wallet.
  ///   2. Verify the message contains the expected nonce and wallet address.
  ///   3. Consume the nonce to prevent replay.
  ///   4. Create or update the user record.
  ///   5. Issue a 24-hour session token.
  ///
  /// Note: Full on-chain ECDSA recovery is not performed; the frontend (Wagmi /
  /// Viem) is responsible for the cryptographic signature check.  The canister
  /// enforces nonce freshness and message format correctness.
  public func verifySiweSignature(
    walletAddress : Text,
    message : Text,
    signature : Text,
  ) : async { #ok : Text; #err : Text } {
    Debug.todo()
  };

  /// Return the user profile associated with a valid, unexpired session token,
  /// or null when the token is missing or expired.
  public query func validateSession(
    sessionToken : Text,
  ) : async ?{
    walletAddress : Text;
    createdAt : Int;
    lastLogin : Int;
  } {
    Debug.todo()
  };

  /// Invalidate a session (logout).
  public func logout(sessionToken : Text) : async () {
    Debug.todo()
  };
};
