import Rhino.Geometry as rg
from Grasshopper.Kernel.Parameters import Param_Geometry, Param_Brep
from Grasshopper.Kernel.Special import GH_NumberSlider
from Grasshopper.Kernel.Data import GH_Path
from Grasshopper.Kernel.Types import GH_Brep
import Grasshopper  
import scriptcontext as sc
from System.Drawing import PointF
from System import Decimal

class MyComponent:

    @staticmethod
    def RunScript(gh_doc, component):
        # 1. Retrieve the EFM data from sticky
        EFM = sc.sticky.get("EFM", {})

        sender_components = sc.sticky.get("sender_components", set())
        
        # Check if "GeomDict" -> "Elements" structure exists
        if ("GeomDict" not in EFM) or ("Elements" not in EFM["GeomDict"]):
            return []  # Nothing to place

        elements = EFM["GeomDict"]["Elements"]

        # Get set of current element names from EFM
        current_element_names = {elem["name"] for elem in elements}

        # Remove components for elements that no longer exist
        objects_to_remove = []
        for obj in gh_doc.Objects:
            if obj.NickName in sender_components:  # Only check components we created
                if isinstance(obj, Param_Brep):
                    if obj.NickName not in current_element_names:
                        objects_to_remove.append(obj)
                elif isinstance(obj, GH_NumberSlider):
                    base_name = obj.NickName.replace("_Thickness", "")
                    if base_name not in current_element_names:
                        objects_to_remove.append(obj)

        for obj in objects_to_remove:
            sender_components.remove(obj.NickName)  # Remove from our tracking set
            gh_doc.RemoveObject(obj, False)
        
        # 2. Read existing GH nicknames so we don't duplicate
        existing_nicknames = set()

        max_y = 200  # Default starting Y position
        y_spacing = 80

        for obj in gh_doc.Objects:
            if isinstance(obj, (Param_Brep, GH_NumberSlider)):
                existing_nicknames.add(obj.NickName)
                # Update max_y if this component is lower
                obj_bottom = obj.Attributes.Pivot.Y
                max_y = max(max_y, obj_bottom) - y_spacing

        # 3. For each element, create geometry param + slider if needed
        xPos = 100  # Starting X on canvas
        yPos = max_y + y_spacing  # Start below the lowest existing component


        for i, elem in enumerate(elements):
            elem_name = elem["name"]
            elem_thickness = elem["thickness"]
            elem_geometries = elem["geometries"]  # Actual Rhino surfaces in memory

            path = GH_Path(i)


            # --- A) Param_Geometry for the element ---
            if elem_name not in existing_nicknames:
                geo_param = Param_Brep()
                #geo_param = Param_Geometry()
                geo_param.Name = elem_name
                geo_param.NickName = elem_name
                geo_param.Description = "Holds geometry for " + elem_name
                geo_param.CreateAttributes()
                
                yPos += y_spacing  # Shift downward for the next item

                geo_param.Attributes.Pivot = PointF(xPos, yPos)

                # Instead of VolatileData:
                geo_param.PersistentData.ClearData()
                for j, srf in enumerate(elem_geometries):
                    # 1) Duplicate as trimmed single-face brep
                    face_brep = srf.DuplicateFace(True) 
                    # 2) Wrap in GH_Brep
                    gh_face_brep = GH_Brep(face_brep)


                    #geo_param.AddVolatileData(path, j, gh_brep)
                    geo_param.PersistentData.Append(gh_face_brep)
                gh_doc.AddObject(geo_param, False)
                existing_nicknames.add(elem_name)
                
                sender_components.add(elem_name) 

            # --- B) GH_NumberSlider for the thickness ---
            slider_name = f"{elem_name}_Thickness"
            if slider_name not in existing_nicknames:
                slider = GH_NumberSlider()
                slider.Name = slider_name
                slider.NickName = slider_name
                slider.Slider.Minimum = Decimal(0.0)
                slider.Slider.Maximum = Decimal(10000.0)
                slider.Slider.Value = Decimal(elem_thickness)
                slider.CreateAttributes()
                slider.Attributes.Pivot = PointF(xPos + 150, yPos ) # Place beside the geometry param

                gh_doc.AddObject(slider, False)
                existing_nicknames.add(slider_name)

                yPos += y_spacing  # Shift for the next item

                sender_components.add(slider_name) 

            # Save our component tracking list back to sticky
            sc.sticky["sender_components"] = sender_components

        # 4. Force Grasshopper to finalize layout
        def on_solution_end(doc):
            doc.NewSolution(False)

        gh_doc.ScheduleSolution(1, on_solution_end)
        
        return elements

