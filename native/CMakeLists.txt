cmake_minimum_required(VERSION 3.20)
project(projectv_core LANGUAGES CXX)
add_executable(projectv_core src/projectv_core.cpp)
target_include_directories(projectv_core PRIVATE include)
target_compile_features(projectv_core PRIVATE cxx_std_20)
if(EMSCRIPTEN)
  set_target_properties(projectv_core PROPERTIES OUTPUT_NAME "projectv-core" SUFFIX ".js")
  target_link_options(projectv_core PRIVATE
    "-sWASM=1"
    "-sMODULARIZE=1"
    "-sEXPORT_ES6=1"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sENVIRONMENT=web,worker"
    "-sEXPORTED_FUNCTIONS=['_projectv_api_version','_projectv_rpf_magic']"
  )
endif()
