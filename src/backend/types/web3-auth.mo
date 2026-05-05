import Map "mo:core/Map";

module {
  /// A stored user record — minimal profile as per requirements
  public type User = {
    walletAddress : Text;
    createdAt : Int;
    var lastLogin : Int;
  };

  /// Public (shared) user record returned over the API boundary (no var fields)
  public type UserPublic = {
    walletAddress : Text;
    createdAt : Int;
    lastLogin : Int;
  };

  /// A pending nonce entry — consumed after one successful verification
  public type NonceEntry = {
    nonce : Text;
    walletAddress : Text;
    expiresAt : Int;
  };

  /// An active session — expires after 24 hours
  public type Session = {
    token : Text;
    walletAddress : Text;
    expiresAt : Int;
  };

  /// State slices injected into lib / mixins
  public type Users = Map.Map<Text, User>;
  public type Nonces = Map.Map<Text, NonceEntry>;
  public type Sessions = Map.Map<Text, Session>;
};
