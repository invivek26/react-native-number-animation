require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NumberAnimation"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "17.0" }
  s.source       = { :git => "https://github.com/invivek26/react-native-number-animation.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"
  s.static_framework = true
  s.swift_version = "5.9"
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "NumberAnimation-Swift.h"
  }

  install_modules_dependencies(s)
end
