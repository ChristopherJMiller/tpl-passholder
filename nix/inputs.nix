{ pkgs, ... }:

let
  buildInputs = with pkgs; [
    yarn
    nodejs_20
    minikube
  ];
in
{
  inherit buildInputs;
}