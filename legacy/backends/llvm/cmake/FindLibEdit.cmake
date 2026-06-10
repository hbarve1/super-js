# FindLibEdit.cmake
# Finds the libedit library
#
# This will define the following variables:
#
#   LibEdit_FOUND        - True if the system has libedit
#   LibEdit_INCLUDE_DIRS - libedit include directory
#   LibEdit_LIBRARIES    - libedit libraries
#   LibEdit_VERSION      - libedit version

find_path(LibEdit_INCLUDE_DIRS
    NAMES histedit.h
    PATHS
        /opt/homebrew/opt/libedit/include
        /usr/local/opt/libedit/include
        /usr/include
)

find_library(LibEdit_LIBRARIES
    NAMES edit
    PATHS
        /opt/homebrew/opt/libedit/lib
        /usr/local/opt/libedit/lib
        /usr/lib
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(LibEdit
    REQUIRED_VARS LibEdit_LIBRARIES LibEdit_INCLUDE_DIRS
)

mark_as_advanced(LibEdit_INCLUDE_DIRS LibEdit_LIBRARIES) 