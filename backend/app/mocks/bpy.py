# Mock for blender python module
# backend/app/mocks/bpy.py

class MockObject:
    def __init__(self, name="MockObject"):
        self.name = name
        self.data = None
        self.location = [0, 0, 0]
        self.rotation_euler = [0, 0, 0]
        self.modifiers = []

class MockContext:
    def __init__(self):
        self.scene = MockScene()
        self.view_layer = MockViewLayer()

class MockScene:
    def __init__(self):
        self.render = MockRender()
        self.objects = {}

class MockRender:
    def __init__(self):
        self.filepath = ""
        self.resolution_x = 1920
        self.resolution_y = 1080

class MockViewLayer:
    def __init__(self):
        self.objects = MockObjectCollection()

class MockObjectCollection:
    def __init__(self):
        self.active = None

class MockOpsObject:
    def select_all(self, action='SELECT'): pass
    def delete(self, use_global=False): pass
    def mode_set(self, mode='OBJECT'): pass

class MockOpsRender:
    def render(self, write_still=True): pass

class MockOpsMesh:
    def primitive_cube_add(self, size=1.0): pass

class MockOps:
    def __init__(self):
        self.object = MockOpsObject()
        self.render = MockOpsRender()
        self.mesh = MockOpsMesh()

# Root module mocks
context = MockContext()
data = MockScene() # Simplified mapping
ops = MockOps()

def props(*args, **kwargs): pass
def types(*args, **kwargs): pass
