/// Feature flags that control which social-auth providers are shown.
/// Set the corresponding flag to `true` once you have configured the
/// provider credentials in the backend and this app.
class SocialAuthConfig {
  SocialAuthConfig._();

  static const bool googleEnabled = bool.fromEnvironment(
    'GOOGLE_ENABLED',
    defaultValue: false,
  );

  static const bool githubEnabled = bool.fromEnvironment(
    'GITHUB_ENABLED',
    defaultValue: false,
  );

  static const bool facebookEnabled = bool.fromEnvironment(
    'FACEBOOK_ENABLED',
    defaultValue: false,
  );

  /// Returns true if at least one social provider is enabled.
  static bool get anyEnabled =>
      googleEnabled || githubEnabled || facebookEnabled;
}
