{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = (import ./nix/inputs.nix pkgs).buildInputs;
}
