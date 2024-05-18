{
  description = "TPL Passholder";

  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url  = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        nativeBuildInputs = with pkgs; [
            yarn
            nodejs_20
        ];
    in
    with pkgs;
    {
      devShells.default = mkShell {
        inherit nativeBuildInputs;
      };
    }
  );
}
